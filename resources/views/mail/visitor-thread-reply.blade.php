<x-mail::message>
# You have a new reply

**{{ $resume->contact['full_name'] ?? $resume->name }}** replied to your message:

<x-mail::panel>
{{ $ownerMessage->body }}
</x-mail::panel>

<x-mail::button :url="route('public.resume', $shareLink->token)">
View Conversation
</x-mail::button>

You're receiving this because you sent a message via a shared resume link.
</x-mail::message>
