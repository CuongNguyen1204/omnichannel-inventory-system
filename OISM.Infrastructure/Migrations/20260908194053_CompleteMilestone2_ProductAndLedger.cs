using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OISM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CompleteMilestone2_ProductAndLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryLedgers_Branches_BranchId",
                table: "InventoryLedgers");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryLedgers_Products_ProductId",
                table: "InventoryLedgers");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLedgers_BranchId",
                table: "InventoryLedgers");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLedgers_ProductId",
                table: "InventoryLedgers");

            migrationBuilder.RenameColumn(
                name: "QuantityChanged",
                table: "InventoryLedgers",
                newName: "Quantity");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "InventoryLedgers",
                newName: "VariantId");

            migrationBuilder.AddColumn<int>(
                name: "BalanceAfter",
                table: "InventoryLedgers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "InventoryLedgers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BalanceAfter",
                table: "InventoryLedgers");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "InventoryLedgers");

            migrationBuilder.RenameColumn(
                name: "VariantId",
                table: "InventoryLedgers",
                newName: "ProductId");

            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "InventoryLedgers",
                newName: "QuantityChanged");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLedgers_BranchId",
                table: "InventoryLedgers",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLedgers_ProductId",
                table: "InventoryLedgers",
                column: "ProductId");

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
    }
}
