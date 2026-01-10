import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Décorateur personnalisé pour récupérer l'utilisateur actuellement authentifié depuis la requête.
 * Permet d'injecter l'objet utilisateur (ou une de ses propriétés) dans les contrôleurs.
 *
 * @param data - (Optionnel) Le nom d'une propriété spécifique de l'utilisateur à récupérer (ex: 'id', 'email').
 * @param ctx - Le contexte d'exécution de la requête.
 * @returns L'objet utilisateur complet ou la valeur de la propriété demandée.
 *
 * @example
 * \@Get()
 * findAll(\@CurrentUser() user: User) { ... }
 *
 * @example
 * \@Get()
 * findOne(\@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
