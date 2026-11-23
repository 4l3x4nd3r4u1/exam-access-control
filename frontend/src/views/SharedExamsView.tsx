import { useEffect, useState } from 'react';
import { JoinSharedExamDrawer } from '../components/JoinSharedExamDrawer';
import { sharedExamService } from '../services/sharedExamService';
import { formatExamType, formatTime } from '../utils/examFormat';
import type { SharedExamItem } from '../types/sharedExam';

interface SharedExamsViewProps {
  teacherId: number;
  onBack: () => void;
  onLogout: () => void;
}

export function SharedExamsView({
  teacherId,
  onBack,
  onLogout,
}: SharedExamsViewProps) {
  const [sharedExams, setSharedExams] = useState<SharedExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Drawer state
  const [selectedExam, setSelectedExam] = useState<SharedExamItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchSharedExams = () => {
    setIsLoading(true);
    setError(null);

    sharedExamService
      .getSharedExams()
      .then((items) => {
        setSharedExams(items);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al cargar los exámenes compartidos.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchSharedExams();
  }, []);

  const handleOpenEdit = (examItem: SharedExamItem) => {
    setSelectedExam(examItem);
    setIsDrawerOpen(true);
  };

  const handleUpdateSuccess = () => {
    setIsDrawerOpen(false);
    setSelectedExam(null);
    setSuccessToast(
      '¡Asignación de estudiantes y aulas actualizada exitosamente!',
    );
    fetchSharedExams();
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <main className="app-shell cg-screen">
      <header className="cg-topbar">
        <button
          type="button"
          className="cg-icon-button"
          onClick={onBack}
          aria-label="Volver al panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="cg-icon-button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <div style={{ marginBottom: '24px' }}>
        <h1 className="cg-title" style={{ marginBottom: '6px' }}>
          Exámenes Compartidos
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Visualiza y gestiona las evaluaciones conjuntas coordinadas entre grupos paralelos.
        </p>
      </div>

      {successToast && (
        <div
          role="status"
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '18px',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* FEEDBACK Y CARGA */}
      {isLoading && <p className="cg-feedback">Cargando exámenes compartidos...</p>}

      {error && (
        <p className="cg-feedback cg-error" role="alert">
          {error}
        </p>
      )}

      {/* LISTA VACÍA */}
      {!isLoading && !error && sharedExams.length === 0 && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>
            No participas en ningún examen compartido en este momento.
          </p>
        </div>
      )}

      {/* LISTA DE EXÁMENES COMPARTIDOS */}
      {!isLoading && !error && sharedExams.length > 0 && (
        <section aria-label="Lista de exámenes compartidos" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {sharedExams.map((item) => {
            const exam = item.exam;
            if (!exam) return null;

            return (
              <article
                key={item.shared_exam_id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* CABECERA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {formatExamType(exam.exam_type)}
                      </span>
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        ✓ Compartido
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '2px 0 4px' }}>
                      {exam.subject_code} - {exam.subject_name}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                      Docentes: <strong style={{ color: '#0f172a' }}>{exam.host_teacher_name}</strong> (G{exam.host_group_code}) &amp;{' '}
                      <strong style={{ color: '#0f172a' }}>{exam.co_teacher_name || 'Docente Invitado'}</strong> (G{exam.co_group_code || item.invited_group?.group_code || '2'})
                    </p>
                  </div>
                </div>

                {/* DETALLES DE FECHA Y HORARIO (BLOQUEADOS) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '8px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Fecha:</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.84rem' }}>{exam.date}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Horario:</span>
                    <strong style={{ color: '#0284c7', fontSize: '0.84rem' }}>
                      {formatTime(exam.start_time)} - {formatTime(exam.end_time)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Aulas consolidadas:</span>
                    <span style={{ color: '#334155', fontSize: '0.82rem', fontWeight: 600 }}>
                      {exam.host_rooms.map((r) => r.room_name).join(', ')}
                    </span>
                  </div>
                </div>

                {/* BOTÓN PARA MODIFICAR ESTUDIANTES Y AULAS */}
                <div style={{ paddingTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    style={{
                      width: '100%',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    <span>✏️</span>
                    <span>Modificar Estudiantes y Aulas</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* DRAWER PARA MODIFICAR ESTUDIANTES Y AULAS */}
      <JoinSharedExamDrawer
        isOpen={isDrawerOpen}
        invitation={selectedExam}
        teacherId={teacherId}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedExam(null);
        }}
        onSuccess={handleUpdateSuccess}
      />
    </main>
  );
}
