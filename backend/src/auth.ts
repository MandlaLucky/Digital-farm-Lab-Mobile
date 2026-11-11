import { Injectable, CanActivate, ExecutionContext, SetMetadata, createParamDecorator, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
const PUB='isPublic'; export const Public=()=>SetMetadata(PUB,true);
const ROLES='roles'; export const Roles=(...r:string[])=>SetMetadata(ROLES,r);
@Injectable() export class JwtAuthGuard implements CanActivate {
  constructor(private jwt:JwtService, private ref:Reflector) {}
  async canActivate(ctx:ExecutionContext):Promise<boolean>{
    if (this.ref.getAllAndOverride<boolean>(PUB,[ctx.getHandler(),ctx.getClass()])) return true;
    const req=ctx.switchToHttp().getRequest();
    const h=req.headers.authorization||'';
    if (!h.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    try { req.user = await this.jwt.verifyAsync(h.slice(7)); return true; }
    catch { throw new UnauthorizedException('Invalid token'); }
  }
}
@Injectable() export class RolesGuard implements CanActivate {
  constructor(private ref:Reflector) {}
  canActivate(ctx:ExecutionContext):boolean{
    const need=this.ref.getAllAndOverride<string[]>(ROLES,[ctx.getHandler(),ctx.getClass()]);
    if (!need || need.length===0) return true;
    const roles:string[]=(ctx.switchToHttp().getRequest().user?.roles||[]).map((x:string)=>String(x).toUpperCase());
    if (need.some((r:string)=>roles.includes(r.toUpperCase()))) return true;
    throw new ForbiddenException('Missing required role');
  }
}
export const CurrentUser = createParamDecorator((_:unknown, ctx:ExecutionContext) => ctx.switchToHttp().getRequest().user || {});
