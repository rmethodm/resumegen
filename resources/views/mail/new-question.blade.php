<x-mail::message>
# New message on "{{ $resume->name }}"

**{{ $question->sender_name }}** ({{ $question->sender_email }}) sent you a message via your shared resume link:

<x-mail::panel>
{{ $question->message }}
</x-mail::panel>

<x-mail::button :url="route('builder.edit', $resume->id)">
View in Editor
</x-mail::button>

You're receiving this because someone submitted a question via a share link on your resume.
</x-mail::message>
