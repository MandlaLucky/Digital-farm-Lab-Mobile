import { Catch, ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
@Catch() export class AllExceptionsFilter implements ExceptionFilter {
  catch(ex:unknown, host:ArgumentsHost){
    const res=host.switchToHttp().getResponse();
    const status = ex instanceof HttpException ? ex.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = ex instanceof HttpException ? ex.getResponse() : { message:'An unexpected error occurred.' };
    const msg = typeof raw==='string' ? raw : (raw as any)?.message || String(ex);
    const map:Record<number,string> = {400:'BAD_REQUEST',401:'UNAUTHORIZED',403:'FORBIDDEN',404:'NOT_FOUND',409:'CONFLICT',500:'INTERNAL_ERROR'};
    res.status(status).json({ code: map[status] || 'ERROR', message: msg, fieldErrors: [] });
  }
}
