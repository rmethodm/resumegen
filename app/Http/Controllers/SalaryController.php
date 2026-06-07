<?php

namespace App\Http\Controllers;

use App\Data\SalaryRanges;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryController extends Controller
{
    public function hint(Request $request): JsonResponse
    {
        $request->validate(['role' => ['required', 'string', 'max:150']]);

        return response()->json(SalaryRanges::lookup($request->string('role')));
    }
}
