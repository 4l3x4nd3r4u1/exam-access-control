<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invitación docente a examen</title>
</head>
<body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#20242a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f4f6f8">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(20,31,45,.10)">
                    <tr>
                        <td style="padding:28px 32px;background:#2875ed;color:#ffffff">
                            <p style="margin:0 0 8px;font-size:14px;opacity:.86">Sistema de Control de Exámenes</p>
                            <h1 style="margin:0;font-size:26px">Invitación docente a examen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.5">
                                Hola <strong>{{ $invitation->invitedTeacher->nombre }}</strong>,
                                {{ $invitation->inviter->nombre }} te invitó a colaborar en el siguiente examen.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="margin-bottom:22px;background:#f7f8fa;border-radius:10px;font-size:15px">
                                <tr><td><strong>Materia</strong></td><td>{{ $invitation->exam->courseGroup?->course?->nombre }}</td></tr>
                                <tr><td><strong>Grupo</strong></td><td>{{ $invitation->exam->courseGroup?->grupo }}</td></tr>
                                <tr><td><strong>Examen</strong></td><td>{{ $invitation->exam->examType?->nombre }}</td></tr>
                                <tr><td><strong>Fecha</strong></td><td>{{ $invitation->exam->fecha?->format('d/m/Y') }}</td></tr>
                                <tr><td><strong>Horario</strong></td><td>{{ substr($invitation->exam->hora_inicio, 0, 5) }}–{{ substr($invitation->exam->hora_fin, 0, 5) }}</td></tr>
                                <tr><td><strong>Aulas</strong></td><td>{{ $invitation->exam->rooms->pluck('nombre')->join(', ') ?: 'Por definir' }}</td></tr>
                            </table>

                            <div style="margin-bottom:24px;padding:18px;background:#eef4ff;border-left:4px solid #2875ed;border-radius:8px">
                                <strong>Mensaje de {{ $invitation->inviter->nombre }}</strong>
                                <p style="margin:10px 0 0;line-height:1.55;white-space:pre-line">{{ $invitation->mensaje }}</p>
                            </div>

                            <p style="margin:0 0 22px;line-height:1.5">
                                No necesitas aceptar la invitación. El examen ya está disponible en tu cuenta.
                            </p>

                            <a href="{{ $frontendUrl }}" style="display:inline-block;padding:12px 20px;background:#2875ed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700">
                                Ingresar al sistema
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
