<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_api_response_carries_security_headers(): void
    {
        $response = $this->getJson('/api/stats')->assertOk();
        $response->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        $this->assertFalse($response->headers->has('Strict-Transport-Security'), 'HSTS ne s’envoie qu’en HTTPS');

        $this->getJson('https://localhost/api/stats')->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_login_attempts_are_limited_per_ip_even_with_different_emails(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            $this->postJson('/api/login', ['email' => "personne{$i}@exemple.sn", 'password' => 'mauvais-mot-de-passe'])->assertUnprocessable();
        }
        $this->postJson('/api/login', ['email' => 'personne21@exemple.sn', 'password' => 'mauvais-mot-de-passe'])->assertStatus(429);
    }
}
