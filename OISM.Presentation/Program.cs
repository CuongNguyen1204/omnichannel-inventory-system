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

// --- Hangfire ---
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options => 
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"))));

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

// --- API & Web Services ---
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();

// --- CORS Configuration ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("PosCorsPolicy", policyBuilder =>
    {
        policyBuilder.WithOrigins("http://localhost:5173", "http://localhost:3000") // URL của React app
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials(); // Rất quan trọng cho SignalR
    });
});

// --- JWT Authentication & Authorization ---
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? throw new InvalidOperationException("JWT Secret is missing");
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// UseCors phải được gọi trước UseAuthentication và UseAuthorization
app.UseCors("PosCorsPolicy");

app.UseAuthentication(); 
app.UseAuthorization();

// Map Endpoints
app.MapControllers();
app.MapHub<OrderHub>("/order-hub");
app.UseHangfireDashboard("/hangfire");

app.Run();