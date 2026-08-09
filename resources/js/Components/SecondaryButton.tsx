import { ButtonHTMLAttributes } from 'react';
import { Button } from '@/Components/ui/button';

export default function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button variant="outline" className={className} {...props} />;
}
