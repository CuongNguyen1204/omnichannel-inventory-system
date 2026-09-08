using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OISM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryMilestone2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "InventoryLedgers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "ReferenceId",
                table: "InventoryLedgers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionType",
                table: "InventoryLedgers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sku = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLedgers_BranchId",
                table: "InventoryLedgers",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLedgers_ProductId",
                table: "InventoryLedgers",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_TenantId_Sku",
                table: "Products",
                columns: new[] { "TenantId", "Sku" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryLedgers_Branches_BranchId",
                table: "InventoryLedgers",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryLedgers_Products_ProductId",
                table: "InventoryLedgers",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryLedgers_Branches_BranchId",
                table: "InventoryLedgers");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryLedgers_Products_ProductId",
                table: "InventoryLedgers");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLedgers_BranchId",
                table: "InventoryLedgers");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLedgers_ProductId",
                table: "InventoryLedgers");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "InventoryLedgers");

            migrationBuilder.DropColumn(
                name: "ReferenceId",
                table: "InventoryLedgers");

            migrationBuilder.DropColumn(
                name: "TransactionType",
                table: "InventoryLedgers");
        }
    }
}
