<?php

    namespace App\Core\Enums;

    enum Role: string
    {
        case DOCENTE = 'TEACHER';
        case AUXILIAR = 'ASSISTANT';
        case ADMIN = 'ADMIN';
    }