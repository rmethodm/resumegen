import { InputHTMLAttributes } from 'react';
import { Checkbox as UiCheckbox } from '@/Components/ui/checkbox';

export default function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
    return <UiCheckbox {...props} />;
}
