<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * One entry in the skill catalogue users pick from. Not to be confused with
 * {@see Skill}, which is a skill already placed on a resume.
 *
 * @property string $name
 * @property string $category
 * @property string $kind
 * @property int $position
 */
class LibrarySkill extends Model
{
    public const KIND_SOFT = 'soft';

    public const KIND_HARD = 'hard';

    /** Reference data, seeded rather than created at runtime. */
    public $timestamps = false;

    protected $fillable = [
        'name',
        'category',
        'kind',
        'position',
    ];

    /**
     * Catalogue order: hard skills before soft, then the order each category
     * was published in, then the order within it.
     *
     * @param  Builder<LibrarySkill>  $query
     * @return Builder<LibrarySkill>
     */
    public function scopeInCatalogueOrder(Builder $query): Builder
    {
        return $query->orderBy('kind')->orderBy('position');
    }

    /**
     * The whole catalogue as the picker consumes it: one entry per category,
     * carrying its kind and its skill names in published order.
     *
     * Small enough (119 names, a few KB) to travel as a plain Inertia prop
     * rather than earning an endpoint of its own.
     *
     * @return list<array{kind: string, category: string, skills: list<string>}>
     */
    public static function catalogue(): array
    {
        $catalogue = [];

        foreach (self::query()->inCatalogueOrder()->get() as $skill) {
            $catalogue[$skill->category] ??= [
                'kind' => $skill->kind,
                'category' => $skill->category,
                'skills' => [],
            ];

            $catalogue[$skill->category]['skills'][] = $skill->name;
        }

        return array_values($catalogue);
    }
}
