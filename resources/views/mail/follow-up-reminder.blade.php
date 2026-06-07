<x-mail::message>
# Follow up on {{ $application->company }}

A reminder to follow up on your **{{ $application->role }}** application at **{{ $application->company }}**.

Today is a good day to send a brief, polite check-in email to the hiring team.

@if($application->notes)
<x-mail::panel>
**Your notes:** {{ $application->notes }}
</x-mail::panel>
@endif

<x-mail::button :url="route('jobs.edit', $application->id)">
View Application
</x-mail::button>

Good luck!
</x-mail::message>
