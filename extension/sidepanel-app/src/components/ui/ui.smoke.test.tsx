import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Skeleton } from './skeleton';

describe('shadcn primitives', () => {
    it('render without throwing', () => {
        render(
            <div>
                <Button>Click</Button>
                <Input placeholder="hi" />
                <Select>
                    <option value="a">A</option>
                </Select>
                <Card>
                    <CardContent>content</CardContent>
                </Card>
                <Badge>badge</Badge>
                <Alert>
                    <AlertDescription>alert text</AlertDescription>
                </Alert>
                <Tabs defaultValue="a">
                    <TabsList>
                        <TabsTrigger value="a">A tab</TabsTrigger>
                    </TabsList>
                    <TabsContent value="a">a content</TabsContent>
                </Tabs>
                <Skeleton className="h-4 w-4" />
            </div>,
        );
        expect(screen.getByText('Click')).toBeInTheDocument();
        expect(screen.getByText('A tab')).toBeInTheDocument();
    });
});
