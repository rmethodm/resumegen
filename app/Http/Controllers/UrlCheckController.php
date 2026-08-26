<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckUrlRequest;
use App\Services\UrlProbe;
use Illuminate\Http\JsonResponse;

class UrlCheckController extends Controller
{
    public function __invoke(CheckUrlRequest $request, UrlProbe $probe): JsonResponse
    {
        $result = $probe->check((string) $request->validated('url'));

        return response()->json($result);
    }
}
