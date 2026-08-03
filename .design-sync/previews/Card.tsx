import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from 'resumegen';

export function Default() {
  return (
    <Card style={{ width: '320px' }}>
      <CardHeader>
        <CardTitle>Software Engineer</CardTitle>
        <CardDescription>Acme Corp · 2021 – Present</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: '13px', color: '#4b5563' }}>
          Led the migration of the billing pipeline to event-driven processing,
          cutting reconciliation errors by 60%.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">Edit entry</Button>
      </CardFooter>
    </Card>
  );
}
