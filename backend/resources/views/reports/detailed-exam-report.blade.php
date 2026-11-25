<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte Detallado de Examen</title>
    <style>
        @page {
            margin: 46px 42px 50px 42px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10.5px;
            line-height: 1.5;
            color: #1c1c1e;
        }

        .header {
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }

        .header h1 {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #000000;
        }

        .header .subtitle {
            margin: 0;
            font-size: 12px;
            font-weight: bold;
            color: #333333;
        }

        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            background: #f5f5f7;
        }

        .meta-table td {
            padding: 6px 10px;
            border: 1px solid #dedede;
            font-size: 10px;
        }

        .meta-label {
            color: #666666;
            font-weight: bold;
            width: 18%;
        }

        .section-title {
            margin: 16px 0 8px 0;
            font-size: 12px;
            font-weight: bold;
            color: #000000;
            border-bottom: 1px solid #dedede;
            padding-bottom: 4px;
        }

        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }

        .kpi-table td {
            width: 25%;
            padding: 8px 10px;
            border: 1px solid #dedede;
            background: #fafafa;
            text-align: center;
        }

        .kpi-val {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: #000000;
        }

        .kpi-lbl {
            display: block;
            font-size: 9px;
            color: #666666;
            margin-top: 2px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }

        .data-table th {
            background: #eeeeee;
            color: #1c1c1e;
            font-size: 9.5px;
            font-weight: bold;
            text-align: left;
            padding: 6px 7px;
            border: 1px solid #d5d5d5;
        }

        .data-table td {
            padding: 5px 7px;
            border: 1px solid #e2e2e2;
            font-size: 9.5px;
            vertical-align: top;
        }

        .data-table tr:nth-child(even) td {
            background: #fafafa;
        }

        .badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 8.5px;
            font-weight: bold;
        }

        .badge-expulsion {
            background: #fef2f2;
            color: #a83c33;
        }

        .badge-autorizacion,
        .badge-observacion {
            background: #fffbeb;
            color: #b45309;
        }

        .badge-incidente {
            background: #eff6ff;
            color: #2875ed;
        }

        .badge-ingreso {
            background: #ecfdf5;
            color: #16803c;
        }

        .empty-note {
            color: #666666;
            font-style: italic;
            font-size: 9.5px;
            margin: 6px 0 12px 0;
        }

        .footer {
            position: fixed;
            bottom: -26px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8.5px;
            color: #777777;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reporte Detallado de Examen</h1>
        <p class="subtitle">
            {{ $exam['subject_name'] ?? 'Materia' }}
            @if (!empty($exam['subject_code']))
                ({{ $exam['subject_code'] }})
            @endif
            — Grupo {{ $exam['group'] ?? '-' }}
        </p>
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Tipo de examen</td>
            <td>{{ $exam['exam_type'] ?? '-' }}</td>
            <td class="meta-label">Gestión</td>
            <td>{{ $exam['academic_term'] ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Fecha</td>
            <td>{{ $exam['date'] ?? '-' }}</td>
            <td class="meta-label">Horario</td>
            <td>{{ substr((string) ($exam['start_time'] ?? ''), 0, 5) }} - {{ substr((string) ($exam['end_time'] ?? ''), 0, 5) }}</td>
        </tr>
        <tr>
            <td class="meta-label">Docente titular</td>
            <td>{{ $exam['teacher_name'] ?? '-' }}</td>
            <td class="meta-label">Generado por</td>
            <td>{{ $generatedBy }} ({{ \Carbon\Carbon::parse($generatedAt)->format('d/m/Y H:i') }})</td>
        </tr>
    </table>

    <div class="section-title">Resumen General del Examen</div>
    <table class="kpi-table">
        <tr>
            <td>
                <span class="kpi-val">{{ $summary['total_entered'] ?? 0 }} / {{ $summary['total_assigned'] ?? 0 }}</span>
                <span class="kpi-lbl">Ingresos registrados ({{ $summary['total_absent'] ?? 0 }} ausentes)</span>
            </td>
            <td>
                <span class="kpi-val">{{ $summary['total_observations'] ?? 0 }}</span>
                <span class="kpi-lbl">Observaciones y autorizaciones</span>
            </td>
            <td>
                <span class="kpi-val">{{ $summary['total_expulsions'] ?? 0 }}</span>
                <span class="kpi-lbl">Expulsiones</span>
            </td>
            <td>
                <span class="kpi-val">{{ $summary['total_incidents'] ?? 0 }}</span>
                <span class="kpi-lbl">Incidentes / Ampliaciones</span>
            </td>
        </tr>
    </table>

    <div class="section-title">Puntos de Control y Aulas</div>
    @if (empty($exam['rooms']))
        <p class="empty-note">No hay aulas asignadas para este examen.</p>
    @else
        <table class="data-table">
            <thead>
                <tr>
                    <th>Aula / Punto de control</th>
                    <th>Cupo asignado</th>
                    <th>Auxiliar / Encargado</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($exam['rooms'] as $room)
                    <tr>
                        <td>{{ $room['room_name'] ?: '-' }}</td>
                        <td>{{ $room['assigned_capacity'] ?? 0 }}</td>
                        <td>{{ $room['assistant_name'] ?: 'Sin auxiliar asignado' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="section-title">Cronología de Eventos Registrados ({{ count($events) }})</div>
    @if (empty($events))
        <p class="empty-note">No se registraron eventos durante este examen.</p>
    @else
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 14%;">Tipo</th>
                    <th style="width: 16%;">Aula / Hora</th>
                    <th style="width: 28%;">Estudiante / Responsable</th>
                    <th>Detalle registrado</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($events as $event)
                    @php
                        $badgeClass = match ($event['type'] ?? '') {
                            'EXPULSION' => 'badge-expulsion',
                            'AUTORIZACION' => 'badge-autorizacion',
                            'OBSERVACION' => 'badge-observacion',
                            'INCIDENTE' => 'badge-incidente',
                            default => 'badge-ingreso',
                        };
                    @endphp
                    <tr>
                        <td><span class="badge {{ $badgeClass }}">{{ $event['type'] ?? 'EVENTO' }}</span></td>
                        <td>{{ $event['subtitle'] ?? '-' }}</td>
                        <td>{{ $event['title'] ?? '-' }}</td>
                        <td>{{ $event['detail'] ?? '-' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="section-title">Detalle de Asistencia por Estudiante ({{ count($roster) }})</div>
    @if (empty($roster))
        <p class="empty-note">No hay estudiantes asignados a este examen.</p>
    @else
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 28%;">Estudiante</th>
                    <th style="width: 13%;">Código SIS</th>
                    <th style="width: 15%;">Aula</th>
                    <th style="width: 14%;">Estado</th>
                    <th style="width: 10%;">Ingreso</th>
                    <th>Observación / Motivo</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($roster as $student)
                    <tr>
                        <td>{{ $student['nombre'] }}</td>
                        <td>{{ $student['codigo_sis'] ?: '-' }}</td>
                        <td>{{ $student['aula'] ?: '-' }}</td>
                        <td>{{ $student['estado'] }}</td>
                        <td>{{ $student['hora_ingreso'] ?: '-' }}</td>
                        <td>{{ $student['motivo_expulsion'] ?: ($student['observaciones'] ?: '-') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        Sistema de Control de Acceso a Exámenes · Reporte #{{ $reportId }}
    </div>
</body>
</html>
