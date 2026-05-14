import { Strategy } from 'passport-jwt';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { JwtPayload, AuthUser } from './auth.types';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    constructor(config: AppConfigService);
    validate(payload: JwtPayload): Promise<AuthUser>;
}
export {};
