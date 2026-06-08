<x-mail::message>
# You've been invited to join {{ $org->name }}

**{{ $org->owner->name }}** has invited you to join their recruiting workspace on Resumegen.

Once you join, your recruiter can view your resumes and leave notes to help guide your job search.

<x-mail::button :url="route('org.join.show', $member->invite_token)">
Accept Invitation
</x-mail::button>

If you weren't expecting this invitation, you can safely ignore this email.
</x-mail::message>
