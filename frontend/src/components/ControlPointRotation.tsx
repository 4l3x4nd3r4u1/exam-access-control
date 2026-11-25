import { useEffect, useRef, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { controlPointRotationService } from '../services/controlPointRotationService';

import type {
  ControlPoint,
  RotationRequest,
} from '../types/controlPointRotation';

interface ControlPointRotationProps {
  examId: string;
  point: ControlPoint;
  disabled?: boolean;
  onPointChange: (point: ControlPoint) => void;
}

function getControlTypeLabel(type: string): string {
  return type === 'ENTRY'
    ? 'Ingreso'
    : 'Durante el examen';
}

export function ControlPointRotation({
  examId,
  point,
  disabled = false,
  onPointChange,
}: ControlPointRotationProps) {
  const [points, setPoints] = useState<ControlPoint[]>([]);
  const [requests, setRequests] = useState<RotationRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [targetPointId, setTargetPointId] = useState<number | null>(null);
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [directTransfer, setDirectTransfer] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handledRequests = useRef<Set<number>>(new Set());
  const initialized = useRef(false);
  const latestPointChange = useRef(onPointChange);

  useEffect(() => {
    latestPointChange.current = onPointChange;
  }, [onPointChange]);

  const pendingRequest = requests.find(
    (request) => request.status === 'PENDING',
  );

  const incomingRequest = requests.find(
    (request) =>
      request.status === 'PENDING' &&
      request.direction === 'INCOMING',
  );

  const selectedPoint = points.find(
    (item) => item.id === targetPointId,
  );

  const selectedResponsible = selectedPoint?.responsibles.find(
    (item) => item.user_id === receiverId,
  );

  const canTransfer = (item: ControlPoint) => item.can_transfer_to_empty_room === true;
  const availablePoints = points.filter((item) => item.room_id !== point.room_id && item.is_active && (item.active_responsibles_count > 0 || canTransfer(item)));

  useEffect(() => {
    let active = true;
    let loading = false;

    const controller = new AbortController();

    async function refresh() {
      if (loading || !active) return;

      loading = true;

      try {
        const requestResponse =
          await controlPointRotationService.getRotationRequests(
            examId,
            controller.signal,
          );

        const pointResponse =
          await controlPointRotationService.getControlPoints(
            examId,
            controller.signal,
          );

        if (!active) return;

        setPoints(pointResponse.control_points);
        setRequests(requestResponse.requests);

        if (!initialized.current) {
          requestResponse.requests
            .filter((request) => request.status !== 'PENDING')
            .forEach((request) => {
              handledRequests.current.add(request.id);
            });

          initialized.current = true;
        } else {
          const completedRequest = requestResponse.requests.find(
            (request) =>
              request.status !== 'PENDING' &&
              !handledRequests.current.has(request.id),
          );

          if (completedRequest) {
            handledRequests.current.add(completedRequest.id);

            if (completedRequest.status === 'REJECTED') {
              setFeedback('Solicitud de intercambio rechazada.');
            }
          }
        }

        const currentPoint = pointResponse.control_points.find(
          (item) =>
            item.id ===
            pointResponse.current_assignment?.control_point_id,
        );

        if (currentPoint && currentPoint.id !== point.id) {
          latestPointChange.current(currentPoint);
        }
      } catch {
        if (!active) return;
      } finally {
        loading = false;
      }
    }

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [examId, point.id]);

  async function openRotation() {
    setFeedback(null);
    setTargetPointId(null);
    setReceiverId(null);
    setDirectTransfer(false);
    setIsBusy(true);

    try {
      const response =
        await controlPointRotationService.getControlPoints(examId);

      setPoints(response.control_points);
      setIsOpen(true);
    } catch (error: unknown) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los puntos de control.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function sendRequest() {
    if (
      targetPointId === null ||
      (!directTransfer && receiverId === null) ||
      isBusy
    ) {
      return;
    }

    setIsBusy(true);
    setFeedback(null);

    try {
      if (directTransfer) {
        if (!selectedPoint || !canTransfer(selectedPoint)) {
          setIsConfirming(false);
          setFeedback('El traslado ya no está disponible.');
          return;
        }
        const response = await controlPointRotationService.transfer(examId, targetPointId);
        const destination = points.find((item) => item.id === response.assignment.control_point_id);
        setIsConfirming(false);
        setIsOpen(false);
        setFeedback(response.message);
        if (destination) latestPointChange.current(destination);
        return;
      }
      if (receiverId === null) return;
      const response =
        await controlPointRotationService.requestRotation(
          examId,
          targetPointId,
          receiverId,
        );

      setRequests((previous) => [
        {
          ...response.request,
          direction: 'OUTGOING',
        },
        ...previous,
      ]);

      setIsConfirming(false);
      setIsOpen(false);
      setFeedback(response.message);
    } catch (error: unknown) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la solicitud.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function respond(
    requestId: number,
    accepted: boolean,
  ) {
    if (isBusy) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      const response =
        await controlPointRotationService.respondToRotation(
          examId,
          requestId,
          accepted,
        );

      handledRequests.current.add(requestId);

      setRequests((previous) =>
        previous.map((request) =>
          request.id === requestId
            ? {
                ...response.request,
                direction: request.direction,
              }
            : request,
        ),
      );

      setFeedback(response.message);

      if (accepted) {
        const pointResponse =
          await controlPointRotationService.getControlPoints(
            examId,
          );

        const currentPoint = pointResponse.control_points.find(
          (item) =>
            item.id ===
            pointResponse.current_assignment?.control_point_id,
        );

        if (currentPoint) {
          latestPointChange.current(currentPoint);
        }
      }
    } catch (error: unknown) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No se pudo responder la solicitud.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  function closeRotation() {
    if (isBusy) return;

    setIsOpen(false);
    setTargetPointId(null);
    setReceiverId(null);
    setDirectTransfer(false);
  }

  return (
    <section className="ec-action">
      <button
        type="button"
        className="confirm-modal-btn primary confirm"
        disabled={
          disabled ||
          isBusy ||
          Boolean(pendingRequest)
        }
        onClick={() => void openRotation()}
      >
        Cambiar punto de control
      </button>

      {pendingRequest?.direction === 'OUTGOING' && (
        <p className="cg-feedback" role="status">
          Esperando confirmación de{' '}
          {pendingRequest.receiver.name}.
        </p>
      )}

      {feedback && (
        <p className="cg-feedback" role="status">
          {feedback}
        </p>
      )}

      <ConfirmModal
        isOpen={isOpen && !isConfirming}
        title="Cambiar punto de control"
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        isLoading={isBusy}
        onConfirm={() => {
          if (selectedPoint && (selectedResponsible || (directTransfer && canTransfer(selectedPoint)))) {
            setIsConfirming(true);
          }
        }}
        onCancel={closeRotation}
        message={
          <div>
            <p>
             Aula actual: {point.room_name}
            </p>

            <div className="cg-list">
              {availablePoints.map((item) => (
                <div key={item.id}>
                  <p>
                    <strong>{item.room_name}</strong>
                  </p>

                  {canTransfer(item) && (
                    <label className="cg-row">
                      <input type="radio" name="rotation-responsible" checked={directTransfer && targetPointId === item.id} onChange={() => { setTargetPointId(item.id); setReceiverId(null); setDirectTransfer(true); }} />
                      <span className="cg-row-name">Trasladarme a esta aula sin responsables</span>
                    </label>
                  )}
                  {item.responsibles.map((responsible) => (
                    <label
                      className="cg-row"
                      key={`${item.id}-${responsible.user_id}`}
                    >
                      <input
                        type="radio"
                        name="rotation-responsible"
                        checked={
                          targetPointId === item.id &&
                          receiverId === responsible.user_id
                        }
                        onChange={() => {
                          setTargetPointId(item.id);
                          setReceiverId(responsible.user_id);
                          setDirectTransfer(false);
                        }}
                      />

                      <span className="cg-row-name">
                        {responsible.name}
                      </span>
                    </label>
                  ))}
                </div>
              ))}

              {availablePoints.length === 0 && (
                <p className="cg-feedback">
                  No hay otros responsables disponibles.
                </p>
              )}
            </div>
          </div>
        }
      />

      <ConfirmModal
        isOpen={isConfirming}
        title={directTransfer ? "Confirmar traslado" : "Solicitar intercambio"}
        confirmLabel={directTransfer ? "Trasladarme" : "Enviar solicitud"}
        cancelLabel="Cancelar"
        isLoading={isBusy}
        onConfirm={() => void sendRequest()}
        onCancel={() => {
          if (!isBusy) setIsConfirming(false);
        }}
        message={
          <div>
            {directTransfer ? <p>¿Deseas trasladarte al aula seleccionada?</p> : <p>
              Enviarás una solicitud de intercambio a{' '}
              <strong>{selectedResponsible?.name}</strong>.
            </p>}

            <p>
              Punto actual: {point.room_name} ·{' '}
              {getControlTypeLabel(point.control_type)}
            </p>

            <p>
              Nuevo punto: {selectedPoint?.room_name} ·{' '}
              {getControlTypeLabel(
                selectedPoint?.control_type ?? '',
              )}
            </p>
          </div>
        }
      />

      <ConfirmModal
        isOpen={
          Boolean(incomingRequest) &&
          !isOpen &&
          !isConfirming &&
          !disabled
        }
        title="Solicitud de intercambio"
        confirmLabel="Aceptar"
        cancelLabel="Rechazar"
        closeOnBackdrop={false}
        isLoading={isBusy}
        onConfirm={() => {
          if (incomingRequest) {
            void respond(incomingRequest.id, true);
          }
        }}
        onCancel={() => {
          if (incomingRequest) {
            void respond(incomingRequest.id, false);
          }
        }}
        message={
          <div>
            <p>
              <strong>
                {incomingRequest?.requester.name}
              </strong>{' '}
              solicita intercambiar su punto de control contigo.
            </p>

            <p>
              Tu punto actual: {point.room_name} ·{' '}
              {getControlTypeLabel(point.control_type)}
            </p>

            <p>
              Nuevo punto:{' '}
              {incomingRequest?.requester.room_name}
              {' · '}
              {getControlTypeLabel(
                incomingRequest?.requester.control_type ?? '',
              )}
            </p>
          </div>
        }
      />
    </section>
  );
}