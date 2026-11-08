<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LoginIdentifierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public static function validIdentifiers(): array
    {
        return [
            'ci' => ['30000001'],
            'ci with surrounding spaces' => [' 30000001 '],
            'email' => ['ana.morales@umss.edu.bo'],
            'mixed-case email with surrounding spaces' => [' ANA.MORALES@UMSS.EDU.BO '],
        ];
    }

    #[DataProvider('validIdentifiers')]
    public function test_ci_or_email_authenticates_the_existing_user(string $identifier): void
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        $userCount = User::count();
        $response = $this->postJson('/api/auth/login', [
            'identifier' => $identifier,
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.token_type', 'bearer')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonStructure(['data' => ['token', 'expires_in']]);

        $claims = JWTAuth::setToken($response->json('data.token'))->getPayload();
        $this->assertSame((string) $user->id, (string) $claims->get('sub'));
        $this->assertSame($user->ci, $claims->get('ci'));
        $this->assertContains('DOCENTE', $claims->get('roles'));
        $this->assertSame($userCount, User::count());
        $this->assertDatabaseHas('sesion', ['usuario_id' => $user->id, 'activo' => true]);
    }

    public function test_ci_preserves_letters_internal_spaces_and_leading_zeroes(): void
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        $user->update(['ci' => '00123456-Ab LP']);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => ' 00123456-Ab LP ',
            'password' => 'password123',
        ])->assertOk();

        $this->withHeader('Authorization', 'Bearer ' . $response->json('data.token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.ci', '00123456-Ab LP');
    }

    public function test_legacy_email_and_ci_login_keep_the_same_identity_and_permissions(): void
    {
        $legacy = $this->postJson('/api/auth/login', [
            'email' => 'ANA.MORALES@UMSS.EDU.BO',
            'password' => 'password123',
        ])->assertOk();
        $legacyClaims = JWTAuth::setToken($legacy->json('data.token'))->getPayload();

        $ci = $this->postJson('/api/auth/login', [
            'identifier' => '30000001',
            'password' => 'password123',
        ])->assertOk();
        $ciClaims = JWTAuth::setToken($ci->json('data.token'))->getPayload();

        foreach (['sub', 'name', 'email', 'ci', 'roles', 'functions'] as $claim) {
            $this->assertSame($legacyClaims->get($claim), $ciClaims->get($claim), $claim);
        }
    }

    public function test_users_without_ci_can_still_log_in_by_email(): void
    {
        User::where('email', 'ana.morales@umss.edu.bo')->update(['ci' => null]);

        $this->postJson('/api/auth/login', [
            'identifier' => 'ana.morales@umss.edu.bo',
            'password' => 'password123',
        ])->assertOk();
    }

    public static function invalidCredentials(): array
    {
        return [
            'wrong password' => ['30000001', 'incorrecta'],
            'unknown ci' => ['000000-NO-EXISTE', 'password123'],
            'unknown email' => ['no-existe@umss.edu.bo', 'password123'],
            'database id is not a ci' => ['2', 'password123'],
        ];
    }

    #[DataProvider('invalidCredentials')]
    public function test_invalid_credentials_do_not_create_a_session(string $identifier, string $password): void
    {
        $sessionCount = DB::table('sesion')->count();

        $this->postJson('/api/auth/login', compact('identifier', 'password'))
            ->assertUnauthorized()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Credenciales incorrectas');

        $this->assertSame($sessionCount, DB::table('sesion')->count());
    }

    public function test_inactive_user_cannot_log_in_by_ci(): void
    {
        User::where('email', 'ana.morales@umss.edu.bo')->update(['activo' => false]);

        $this->postJson('/api/auth/login', [
            'identifier' => '30000001',
            'password' => 'password123',
        ])->assertUnauthorized()->assertJsonPath('message', 'Usuario inactivo o deshabilitado');

        $this->assertDatabaseCount('sesion', 0);
    }

    public function test_password_is_not_trimmed(): void
    {
        User::where('email', 'ana.morales@umss.edu.bo')->update(['contrasena' => Hash::make(' clave con espacios ')]);

        $this->postJson('/api/auth/login', [
            'identifier' => '30000001',
            'password' => ' clave con espacios ',
        ])->assertOk();
    }

    public static function invalidIdentifiers(): array
    {
        return [
            'missing' => [[], 'identifier'],
            'empty' => [['identifier' => ''], 'identifier'],
            'whitespace' => [['identifier' => '   '], 'identifier'],
            'numeric json value' => [['identifier' => 30000001], 'identifier'],
            'array' => [['identifier' => ['30000001']], 'identifier'],
            'too long' => [['identifier' => str_repeat('a', 151)], 'identifier'],
            'ambiguous fields' => [['identifier' => '30000001', 'email' => 'ana.morales@umss.edu.bo'], 'identifier'],
            'legacy email must remain an email' => [['email' => '30000001'], 'email'],
        ];
    }

    #[DataProvider('invalidIdentifiers')]
    public function test_invalid_payloads_are_rejected_before_authentication(array $payload, string $field): void
    {
        $this->postJson('/api/auth/login', [...$payload, 'password' => 'password123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);

        $this->assertDatabaseCount('sesion', 0);
    }

    public function test_identifier_still_requires_a_password(): void
    {
        $this->postJson('/api/auth/login', ['identifier' => '30000001'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
