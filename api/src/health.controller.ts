import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/auth.decorators";

@Controller()
export class HealthController {
  @Public()
  @Get("health")
  health() {
    return { ok: true, service: "eos-pmd-api", time: new Date().toISOString() };
  }
}
