
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe de incidencia de examen</title>
    <style>
        @page {
            margin: 65px 65px 60px 65px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            line-height: 1.8;
            color: #222;
        }

        .titulo {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 35px;
        }

        .subtitulo {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 22px;
        }

        .responsables {
            text-align: right;
            margin-top: 25px;
            margin-bottom: 35px;
        }

        .responsables p {
            margin: 5px 0;
        }

        .datos {
            margin-bottom: 30px;
        }

        .datos p {
            margin: 5px 0;
        }

        .seccion {
            font-size: 13px;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 12px;
        }

        .descripcion {
            text-align: justify;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            line-height: 2;
        }

        .fecha-registro {
            margin-top: 35px;
            font-size: 11px;
            color: #555;
        }

        .pie {
            position: fixed;
            bottom: -30px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #777;
        }
    </style>
</head>
<body>

    <div class="titulo">
        INFORME DE INCIDENCIA DE EXAMEN
    </div>

    <div class="subtitulo">
        {{ $exam->courseGroup?->course?->nombre ?? 'Materia no registrada' }}
    </div>

    <div class="responsables">
        <p>
            <strong>Docente:</strong>
            {{ $exam->courseGroup?->teacher?->nombre ?? 'No registrado' }}
        </p>

        <p>
            <strong>Reporte elaborado por:</strong>
            {{ $reportUser ?? 'No identificado' }}
        </p>
    </div>

    <div class="datos">
        <p>
            <strong>Materia:</strong>
            {{ $exam->courseGroup?->course?->nombre ?? 'No registrada' }}
        </p>

        <p>
            <strong>Sigla:</strong>
            {{ $exam->courseGroup?->course?->sigla ?? 'No registrada' }}
        </p>

        <p>
            <strong>Grupo:</strong>
            {{ $exam->courseGroup?->grupo ?? 'No registrado' }}
        </p>

        <p>
            <strong>Fecha del examen:</strong>
            {{ $exam->fecha?->format('d/m/Y') ?? 'No registrada' }}
        </p>

        <p>
            <strong>Horario programado:</strong>
            {{ substr((string) $exam->hora_inicio, 0, 5) }}
            -
            {{ substr((string) $exam->hora_fin, 0, 5) }}
        </p>
    </div>

    <div class="seccion">
        Descripción de los hechos
    </div>

    <div class="descripcion">{{ $description }}</div>

    <div class="fecha-registro">
        <strong>Fecha de elaboración del reporte:</strong>
        {{ \Carbon\Carbon::parse($report->fecha)->format('d/m/Y H:i:s') }}
    </div>

    <div class="pie">
        Sistema de Control de Acceso a Exámenes
    </div>

</body>
</html>
