<x-mail::message>
# New message from {{ $thread->sender_name }}

**{{ $thread->sender_name }}** ({{ $thread->sender_email }}) started a conversation on your resume "**{{ $resume->name }}**":

<x-mail::panel>
{{ $firstMessage->body }}
</x-mail::panel>

<x-mail::button :url="route('builder.thread', [$resume->id, $thread->id])">
Reply in Resumegen
</x-mail::button>

You're receiving this because someone contacted you via your shared resume link.
</x-mail::message>
