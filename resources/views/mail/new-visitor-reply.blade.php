<x-mail::message>
# {{ $thread->sender_name }} replied

**{{ $thread->sender_name }}** added a new message to your conversation on "**{{ $resume->name }}**":

<x-mail::panel>
{{ $newMessage->body }}
</x-mail::panel>

<x-mail::button :url="route('builder.thread', [$resume->id, $thread->id])">
View Conversation
</x-mail::button>

You're receiving this because someone replied to a conversation on your shared resume link.
</x-mail::message>
