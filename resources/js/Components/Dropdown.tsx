import { Transition } from '@headlessui/react';
import { InertiaLinkProps, Link } from '@inertiajs/react';
import {
    createContext,
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { cn } from '@/lib/utils';

const DropDownContext = createContext<{
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    toggleOpen: () => void;
}>({
    open: false,
    setOpen: () => {},
    toggleOpen: () => {},
});

const Dropdown = ({ children }: PropsWithChildren) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const toggleOpen = () => {
        setOpen((previousState) => !previousState);
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <DropDownContext.Provider value={{ open, setOpen, toggleOpen }}>
            <div ref={rootRef} className="relative">
                {children}
            </div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }: PropsWithChildren) => {
    const { toggleOpen } = useContext(DropDownContext);

    return (
        <div onClick={toggleOpen} className="inline-flex">
            {children}
        </div>
    );
};

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1 bg-white',
    children,
}: PropsWithChildren<{
    align?: 'left' | 'right';
    width?: '48';
    contentClasses?: string;
}>) => {
    const { open } = useContext(DropDownContext);

    const alignmentClasses =
        align === 'left'
            ? 'ltr:origin-top-left rtl:origin-top-right inset-s-0'
            : 'ltr:origin-top-right rtl:origin-top-left inset-e-0';

    return (
        <Transition
            show={open}
            enter="motion-safe:transition motion-safe:ease-out motion-safe:duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="motion-safe:transition motion-safe:ease-in motion-safe:duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
        >
            <div
                className={cn(
                    'absolute z-toast mt-2 rounded-md shadow-ambient',
                    alignmentClasses,
                    width === '48' && 'w-48',
                )}
            >
                <div
                    className={cn(
                        'rounded-md border border-surface-border ring-1 ring-ink/5',
                        contentClasses,
                    )}
                >
                    {children}
                </div>
            </div>
        </Transition>
    );
};

const DropdownLink = ({
    className = '',
    children,
    ...props
}: InertiaLinkProps) => {
    const { setOpen } = useContext(DropDownContext);

    return (
        <Link
            {...props}
            onClick={(event) => {
                props.onClick?.(event);
                // Close after the click is handled so POST links still fire.
                if (!event.defaultPrevented) {
                    setOpen(false);
                }
            }}
            className={cn(
                'block w-full px-4 py-2 text-start text-sm leading-5 text-ink transition-colors duration-soft ease-soft',
                'hover:bg-surface focus:bg-surface focus:outline-hidden',
                className,
            )}
        >
            {children}
        </Link>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;
