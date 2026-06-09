<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortfolioMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PortfolioMessage::with('user:id,name,portfolio_slug')->latest();

        if ($request->input('filter') === 'unread') {
            $query->whereNull('read_at');
        }

        return Inertia::render('Admin/Messages/Index', [
            'messages' => $query->paginate(30)->withQueryString(),
            'filter' => $request->input('filter', 'all'),
        ]);
    }

    public function markRead(PortfolioMessage $message): RedirectResponse
    {
        $message->update(['read_at' => now()]);

        return back();
    }

    public function destroy(PortfolioMessage $message): RedirectResponse
    {
        $message->delete();

        return back()->with('success', 'Message deleted.');
    }
}
