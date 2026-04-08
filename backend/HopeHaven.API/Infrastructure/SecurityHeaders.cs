namespace HopeHaven.API.Infrastructure
{
    public static class SecurityHeaders
    {
        public const string ContentSecurityPolicy =
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "connect-src 'self'; " +
            "font-src 'self'; " +
            "base-uri 'self'; " +
            "frame-ancestors 'none'; " +
            "object-src 'none'";

        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        {
            var env = app.ApplicationServices.GetRequiredService<IWebHostEnvironment>();
            return app.Use(async (ctx, next) =>
            {
                ctx.Response.OnStarting(() =>
                {
                    if (!(env.IsDevelopment() &&
                          ctx.Request.Path.StartsWithSegments("/swagger")))
                        ctx.Response.Headers["Content-Security-Policy"] = ContentSecurityPolicy;
                    return Task.CompletedTask;
                });
                await next();
            });
        }
    }
}
