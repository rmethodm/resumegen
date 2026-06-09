<x-mail::message>
# New message from {{ $message->sender_name }}

**{{ $message->sender_name }}** ({{ $message->sender_email }}) sent you a message via your portfolio:

<x-mail::panel>
{{ $message->message }}
</x-mail::panel>

<x-mail::button :url="route('portfolio.edit')">
Portfolio Settings
</x-mail::button>

You're receiving this because someone contacted you via your Resumegen portfolio page.
</x-mail::message>
