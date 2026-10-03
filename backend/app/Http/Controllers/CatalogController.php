<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\EmailDomain;
use App\Models\ExamStudentStatus;
use App\Models\EnrollmentStatus;
use App\Models\ExamType;
use App\Models\Room;
use App\Models\Course;
use App\Models\CourseGroup;
use App\Models\SystemFunction;
use App\Models\FunctionUi;
use App\Models\UiComponent;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    /**
     * Get all roles for select inputs.
     */
    public function roles(): JsonResponse
    {
        $roles = Role::where('activo', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'descripcion'])
            ->map(fn($role) => [
                'value' => $role->id,
                'label' => $role->nombre,
                'description' => $role->descripcion,
            ]);

        return response()->json([
            'success' => true,
            'data' => $roles,
            'message' => 'Roles obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all email domains for select inputs.
     */
    public function emailDomains(): JsonResponse
    {
        $domains = EmailDomain::where('activo', true)
            ->orderBy('dominio')
            ->get(['id', 'dominio', 'descripcion'])
            ->map(fn($domain) => [
                'value' => $domain->id,
                'label' => $domain->dominio,
                'description' => $domain->descripcion,
            ]);

        return response()->json([
            'success' => true,
            'data' => $domains,
            'message' => 'Dominios de correo obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all exam student statuses for select inputs.
     */
    public function examStudentStatuses(): JsonResponse
    {
        $statuses = ExamStudentStatus::orderBy('nombre')
            ->get(['id', 'nombre', 'descripcion'])
            ->map(fn($status) => [
                'value' => $status->id,
                'label' => $status->nombre,
                'description' => $status->descripcion,
            ]);

        return response()->json([
            'success' => true,
            'data' => $statuses,
            'message' => 'Estados de examen obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all enrollment statuses for select inputs.
     */
    public function enrollmentStatuses(): JsonResponse
    {
        $statuses = EnrollmentStatus::orderBy('nombre')
            ->get(['id', 'nombre', 'descripcion'])
            ->map(fn($status) => [
                'value' => $status->id,
                'label' => $status->nombre,
                'description' => $status->descripcion,
            ]);

        return response()->json([
            'success' => true,
            'data' => $statuses,
            'message' => 'Estados de inscripción obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all exam types for select inputs.
     */
    public function examTypes(): JsonResponse
    {
        $types = ExamType::orderBy('nombre')
            ->get(['id', 'nombre'])
            ->map(fn($type) => [
                'value' => $type->id,
                'label' => $type->nombre,
            ]);

        return response()->json([
            'success' => true,
            'data' => $types,
            'message' => 'Tipos de examen obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all rooms for select inputs.
     */
    public function rooms(): JsonResponse
    {
        $rooms = Room::orderBy('nombre')
            ->get(['id', 'nombre', 'capacidad'])
            ->map(fn($room) => [
                'value' => $room->id,
                'label' => $room->nombre,
                'capacity' => $room->capacidad,
            ]);

        return response()->json([
            'success' => true,
            'data' => $rooms,
            'message' => 'Aulas obtenidas exitosamente.',
        ]);
    }

    /**
     * Get all courses (materias) for select inputs.
     */
    public function courses(): JsonResponse
    {
        $courses = Course::where('activo', true)
            ->orderBy('sigla')
            ->get(['id', 'sigla', 'nombre'])
            ->map(fn($course) => [
                'value' => $course->id,
                'label' => "{$course->sigla} - {$course->nombre}",
                'sigla' => $course->sigla,
                'name' => $course->nombre,
            ]);

        return response()->json([
            'success' => true,
            'data' => $courses,
            'message' => 'Materias obtenidas exitosamente.',
        ]);
    }

    /**
     * Get all course groups (materia_grupo) for select inputs.
     */
    public function courseGroups(): JsonResponse
    {
        $groups = CourseGroup::with('course')
            ->where('activo', true)
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn(CourseGroup $group) => [
                'value' => (string) $group->id,
                'label' => "{$group->course->sigla} - {$group->course->nombre} - Grupo {$group->grupo} ({$group->gestion})",
                'course_group_id' => (string) $group->id,
                'sigla' => $group->course->sigla,
                'course_name' => $group->course->nombre,
                'group_code' => $group->grupo,
                'gestion' => $group->gestion,
                'teacher_id' => $group->docente_id,
            ]);

        return response()->json([
            'success' => true,
            'data' => $groups,
            'message' => 'Grupos de materia obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all system functions for select inputs.
     */
    public function functions(): JsonResponse
    {
        $functions = SystemFunction::where('activo', true)
            ->orderBy('numero')
            ->get(['id', 'numero', 'nombre'])
            ->map(fn($fn) => [
                'value' => $fn->id,
                'label' => $fn->nombre,
                'code' => $fn->numero,
            ]);

        return response()->json([
            'success' => true,
            'data' => $functions,
            'message' => 'Funciones del sistema obtenidas exitosamente.',
        ]);
    }

    /**
     * Get all UI function components for select inputs.
     * Uses composite key table directly via DB query.
     */
    public function functionUi(): JsonResponse
    {
        $components = \Illuminate\Support\Facades\DB::table('funcion_ui as fui')
            ->join('funcion as f', 'fui.funcion_id', '=', 'f.id')
            ->join('ui as u', 'fui.ui_id', '=', 'u.id')
            ->select('fui.funcion_id', 'fui.ui_id', 'f.numero as function_code', 'f.nombre as function_name', 'u.nombre as component_name')
            ->get()
            ->map(fn($item) => [
                'value' => $item->funcion_id . '_' . $item->ui_id,
                'label' => $item->function_name . ' → ' . $item->component_name,
                'function_code' => $item->function_code,
                'function_name' => $item->function_name,
                'component_name' => $item->component_name,
            ]);

        return response()->json([
            'success' => true,
            'data' => $components,
            'message' => 'Componentes UI obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all UI components for select inputs.
     */
    public function uiComponents(): JsonResponse
    {
        $components = UiComponent::where('activo', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'descripcion'])
            ->map(fn($comp) => [
                'value' => $comp->id,
                'label' => $comp->nombre,
                'description' => $comp->descripcion,
            ]);

        return response()->json([
            'success' => true,
            'data' => $components,
            'message' => 'Componentes UI obtenidos exitosamente.',
        ]);
    }

    /**
     * Get all email domains (alias for emailDomains).
     */
    public function emails(): JsonResponse
    {
        return $this->emailDomains();
    }

    /**
     * Get all user roles for select inputs.
     */
    public function userRoles(): JsonResponse
    {
        return $this->roles();
    }
}