using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HopeHaven.API.Migrations
{
    [Migration("20260408210200_AddDonorWallFields")]
    public class AddDonorWallFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "donor_wall_name",
                table: "donations",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "share_on_donor_wall",
                table: "donations",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "donor_wall_name",
                table: "donations");

            migrationBuilder.DropColumn(
                name: "share_on_donor_wall",
                table: "donations");
        }
    }
}
