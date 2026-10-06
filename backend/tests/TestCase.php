<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    //
    protected function setUp(): void
    {
        parent::setUp();
        // Les requêtes de test demandent le français (sans cet en-tête, Symfony suppose l'anglais)
        $this->withHeader('Accept-Language', 'fr');
    }
}
