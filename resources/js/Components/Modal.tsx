import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { PropsWithChildren, ReactNode, useId } from 'react';

/**
 * The one shared modal shell. Optional `title` / `description` / `footer` render
 * as sticky header and border-top footer around a scrolling body. Omit them for
 * simple confirm-style dialogs that manage their own layout — still one tree.
 */
export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
    title,
    description,
    footer,
    overlayClassName = 'bg-gray-500/75',
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    closeable?: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    footer?: ReactNode;
    overlayClassName?: string;
}>) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
    }[maxWidth];

    const descriptionId = useId();
    const hasDescription = description !== undefined;
    const hasHeader = title !== undefined || hasDescription;

    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                className="fixed inset-0 z-50 flex transform items-center overflow-y-auto px-4 py-6 transition-[opacity,transform] sm:px-0"
                onClose={close}
                aria-describedby={hasDescription ? descriptionId : undefined}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className={`absolute inset-0 ${overlayClassName}`} />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95 motion-reduce:translate-y-0 motion-reduce:scale-100"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95 motion-reduce:translate-y-0 motion-reduce:scale-100"
                >
                    <DialogPanel
                        className={`relative mb-6 flex max-h-[85dvh] w-full transform flex-col overflow-hidden rounded-lg bg-white shadow-xl transition-[opacity,transform] sm:mx-auto ${maxWidthClass}`}
                    >
                        {hasHeader && (
                            <div className="border-b border-gray-200 px-5 py-4">
                                {title !== undefined && (
                                    <DialogTitle className="text-sm font-bold text-gray-900">
                                        {title}
                                    </DialogTitle>
                                )}
                                {hasDescription && (
                                    <p
                                        id={descriptionId}
                                        className={
                                            title !== undefined
                                                ? 'mt-1 text-xs text-gray-500'
                                                : 'text-xs text-gray-500'
                                        }
                                    >
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {children}
                        </div>
                        {footer !== undefined && (
                            <div className="border-t border-gray-200 px-5 py-3">
                                {footer}
                            </div>
                        )}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
