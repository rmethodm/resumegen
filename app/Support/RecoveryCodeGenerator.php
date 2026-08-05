<?php

namespace App\Support;

class RecoveryCodeGenerator
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    /**
     * @return array{plain: list<string>, hashed: list<string>}
     */
    public static function generate(int $count = 8): array
    {
        $plain = [];
        $hashed = [];

        while (count($plain) < $count) {
            $code = self::segment().'-'.self::segment();
            if (in_array($code, $plain, true)) {
                continue;
            }

            $plain[] = $code;
            $hashed[] = bcrypt($code);
        }

        return ['plain' => $plain, 'hashed' => $hashed];
    }

    private static function segment(): string
    {
        $segment = '';

        for ($i = 0; $i < 5; $i++) {
            $segment .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        return $segment;
    }
}
