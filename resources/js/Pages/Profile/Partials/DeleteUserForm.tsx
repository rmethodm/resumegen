import InputError from '@/Components/InputError';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';

export default function DeleteUserForm({
    className = '',
}: {
    className?: string;
}) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-sm font-bold text-destructive">
                    Delete Account
                </h2>

                <p className="mt-1 text-sm text-muted-foreground/70">
                    Once your account is deleted, all of its resources and data
                    will be permanently deleted. Before deleting your account,
                    please download any data or information that you wish to
                    retain.
                </p>
            </header>

            <Button variant="destructive" onClick={confirmUserDeletion}>
                Delete Account
            </Button>

            <AlertDialog
                open={confirmingUserDeletion}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
            >
                <AlertDialogContent>
                    <form onSubmit={deleteUser}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you sure you want to delete your account?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Once your account is deleted, all of its
                                resources and data will be permanently
                                deleted. Please enter your password to confirm
                                you would like to permanently delete your
                                account.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="mt-4">
                            <Label htmlFor="password" className="sr-only">
                                Password
                            </Label>

                            <Input
                                id="password"
                                type="password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                className="w-3/4"
                                autoFocus
                                placeholder="Password"
                            />

                            <InputError
                                message={errors.password}
                                className="mt-2"
                            />
                        </div>

                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel type="button">
                                Cancel
                            </AlertDialogCancel>

                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={processing}
                            >
                                Delete Account
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
