import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('enterprise_brandings')
export class EnterpriseBranding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id', unique: true })
  enterpriseId: number;

  // ── Identity ──────────────────────────────────────────────────────────────
  @Column({ name: 'app_name', type: 'varchar', nullable: true })
  appName: string | null;

  @Column({ type: 'varchar', nullable: true })
  tagline: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'logo_small_url', type: 'text', nullable: true })
  logoSmallUrl: string | null;

  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl: string | null;

  // ── Colors ────────────────────────────────────────────────────────────────
  @Column({ name: 'primary_color', type: 'varchar', default: '#1677ff' })
  primaryColor: string;

  @Column({ name: 'secondary_color', type: 'varchar', default: '#111827' })
  secondaryColor: string;

  @Column({ name: 'accent_color', type: 'varchar', nullable: true })
  accentColor: string | null;

  @Column({ name: 'color_bg_layout', type: 'varchar', default: '#f0f4f8' })
  colorBgLayout: string;

  // ── Login Page ────────────────────────────────────────────────────────────
  @Column({ name: 'login_bg_image_url', type: 'text', nullable: true })
  loginBgImageUrl: string | null;

  // ── Typography ────────────────────────────────────────────────────────────
  @Column({ name: 'font_family', type: 'varchar', default: 'Inter' })
  fontFamily: string;

  @Column({ name: 'border_radius', type: 'int', default: 8 })
  borderRadius: number;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  @Column({ name: 'sidebar_bg_color', type: 'varchar', nullable: true })
  sidebarBgColor: string | null;

  @Column({ name: 'sidebar_text_color', type: 'varchar', nullable: true })
  sidebarTextColor: string | null;

  // ── Versioning ─────────────────────────────────────────────────────────────
  @Column({ name: 'current_version', default: 0 })
  currentVersion: number;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
