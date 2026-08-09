import { ButtonHTMLAttributes } from 'react';
import { Button } from '@/Components/ui/button';

export default function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button variant="default" className={className} {...props} />;
}
