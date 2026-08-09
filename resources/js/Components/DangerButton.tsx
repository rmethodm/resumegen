import { ButtonHTMLAttributes } from 'react';
import { Button } from '@/Components/ui/button';

export default function DangerButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button variant="destructive" className={className} {...props} />;
}
