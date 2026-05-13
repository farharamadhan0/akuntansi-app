<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Stub Vite directives so backend tests don't depend on a built
        // frontend manifest (public/build/manifest.json).
        $this->withoutVite();
    }
}
