<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'usuario';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nombre',
        'email',
        'email_id',
        'contrasena',
        'activo',
        'ci',
        'name',
        'password',
        'is_active',
        'role',
    ];

    public ?string $tempRole = null;

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            if (empty($user->email_id) && !empty($user->email)) {
                $domain = EmailDomain::where('activo', true)
                    ->get()
                    ->first(fn($d) => str_ends_with(strtolower($user->email), $d->dominio));
                if (!$domain) {
                    $parts = explode('@', $user->email);
                    if (count($parts) === 2) {
                        $domain = EmailDomain::firstOrCreate(
                            ['dominio' => '@' . strtolower($parts[1])],
                            ['descripcion' => 'Dominio detectado', 'activo' => true]
                        );
                    }
                }
                if ($domain) {
                    $user->email_id = $domain->id;
                }
            }
        });

        static::saved(function (User $user) {
            if (!empty($user->tempRole)) {
                $role = Role::where('nombre', $user->tempRole)->first();
                if (!$role) {
                    $role = Role::firstOrCreate(
                        ['nombre' => $user->tempRole],
                        ['descripcion' => 'Rol autogenerado', 'activo' => true]
                    );
                }
                $user->roles()->syncWithPivotValues([$role->id], [
                    'activo' => true,
                    'fecha_asignacion' => now(),
                ]);
            }
        });
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'contrasena',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    /**
     * Get password attribute for Laravel authentication.
     */
    public function getAuthPassword(): string
    {
        return $this->contrasena;
    }

    /**
     * Accessor for password backwards-compatibility.
     */
    public function getPasswordAttribute(): string
    {
        return $this->contrasena ?? '';
    }

    /**
     * Accessor for name backwards-compatibility.
     */
    public function getNameAttribute(): string
    {
        return $this->nombre ?? '';
    }

    /**
     * Accessor for is_active backwards-compatibility.
     */
    public function getIsActiveAttribute(): bool
    {
        return (bool) $this->activo;
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['nombre'] = $value;
    }

    public function setPasswordAttribute($value): void
    {
        $this->attributes['contrasena'] = (is_string($value) && str_starts_with($value, '$2y$')) ? $value : \Illuminate\Support\Facades\Hash::make($value);
    }

    public function setIsActiveAttribute($value): void
    {
        $this->attributes['activo'] = (bool) $value;
    }

    public function setRoleAttribute($value): void
    {
        $roleName = strtoupper(trim((string) $value));
        if ($roleName === 'TEACHER') $roleName = 'DOCENTE';
        if ($roleName === 'ASSISTANT') $roleName = 'AUXILIAR';
        $this->tempRole = $roleName;
    }

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     */
    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array<string, mixed>
     */
    public function getJWTCustomClaims(): array
    {
        $activeRoles = $this->roles()->wherePivot('activo', true)->get();

        $roles = $activeRoles->pluck('nombre')->toArray();
        $roleIds = $activeRoles->pluck('id')->toArray();

        $functions = SystemFunction::whereHas('roles', function ($query) use ($roleIds) {
            $query->whereIn('rol.id', $roleIds);
        })->where('activo', true)->pluck('numero')->unique()->values()->toArray();

        return [
            'roles' => $roles,
            'functions' => $functions,
            'name' => $this->nombre,
            'email' => $this->email,
            'ci' => $this->ci,
        ];
    }

    public function emailDomain(): BelongsTo
    {
        return $this->belongsTo(EmailDomain::class, 'email_id');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'usuario_rol', 'usuario_id', 'rol_id')
            ->withPivot(['activo', 'fecha_asignacion'])
            ->withTimestamps();
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class, 'usuario_id');
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class, 'usuario_id');
    }

    public function taughtCourseGroups(): HasMany
    {
        return $this->hasMany(CourseGroup::class, 'docente_id');
    }

    // Alias for legacy taught courses
    public function courseGroups(): HasMany
    {
        return $this->taughtCourseGroups();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentCourseEnrollment::class, 'usuario_id');
    }

    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('rol.nombre', $roleName)->wherePivot('activo', true)->exists();
    }

    public function hasFunction(string $functionCode): bool
    {
        return SystemFunction::where('numero', $functionCode)
            ->where('activo', true)
            ->whereHas('roles', function ($query) {
                $query->whereIn('rol.id', $this->roles()->wherePivot('activo', true)->pluck('rol.id'));
            })->exists();
    }
}
