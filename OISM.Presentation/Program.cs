using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Hangfire;
using Hangfire.PostgreSql;
using OISM.Application.Interfaces;
using OISM.Infrastructure.Persistence;
using OISM.Infrastructure.Repositories;
using OISM.Infrastructure.Services;
using OISM.Presentation.Services;
using OISM.Presentation.Hubs;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. ĐĂNG KÝ SERVICES (DEPENDENCY INJECTION)
// ==========================================

// --- CSDL PostgreSQL ---
builder.Services.AddDbContext<OismDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- Hangfire (FR-SIM-03) ---
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"))));
builder.Services.AddHangfireServer();

// --- Repositories ---
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();

// --- Application & Infrastructure Services ---
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<OrderEngineService>();
builder.Services.AddScoped<PurchaseReceiptService>();
builder.Services.AddScoped<StockTransferService>();
builder.Services.AddScoped<OrderExpirationJobService>();

// --- API & Web Services ---
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();

// --- CORS Configuration ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("PosCorsPolicy", policyBuilder =>
    {
        policyBuilder.WithOrigins("http://localhost:5173", "http://localhost:3000")
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials();
    });
});

// --- JWT Authentication & Authorization (Hỗ trợ cả HTTP Header & SignalR Query String) ---
var jwtSecret = builder.Configuration["JwtSettings:Secret"]
    ?? throw new InvalidOperationException("JWT Secret is missing");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidAudience = builder.Configuration["JwtSettings:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/order-hub") || path.StartsWithSegments("/orderHub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddAuthorization();

// --- Swagger Configuration ---
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "OISM API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token JWT theo định dạng: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement{
    {
        new OpenApiSecurityScheme{
            Reference = new OpenApiReference{ Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        },
        Array.Empty<string>()
    }});
});

// ==========================================
// 2. CẤU HÌNH HTTP REQUEST PIPELINE
// ==========================================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("PosCorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

// Map Endpoints
app.MapControllers();
app.MapHub<OrderHub>("/order-hub");
app.MapHub<OrderHub>("/orderHub");
app.UseHangfireDashboard("/hangfire");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<OismDbContext>();
    await OISM.Infrastructure.Persistence.DataSeeder.SeedAsync(dbContext);

    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobManager.AddOrUpdate<OrderExpirationJobService>(
        "cancel-expired-reserved-orders",
        service => service.CancelExpiredReservedOrdersAsync(),
        "*/5 * * * *");
}

app.Run();