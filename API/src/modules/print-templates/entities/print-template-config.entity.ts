import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('print_template_configs')
export class PrintTemplateConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id', unique: true })
  enterpriseId: number;

  @Column({ name: 'company_name', type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  tagline: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'logo_width', default: 120 })
  logoWidth: number;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ name: 'gst_number', type: 'varchar', nullable: true })
  gstNumber: string | null;

  @Column({ name: 'cin_number', type: 'varchar', nullable: true })
  cinNumber: string | null;

  @Column({ name: 'header_alignment', default: 'left' })
  headerAlignment: string;

  @Column({ name: 'header_style', default: 'detailed' })
  headerStyle: string;

  @Column({ name: 'show_gst', default: true })
  showGst: boolean;

  @Column({ name: 'show_email', default: true })
  showEmail: boolean;

  @Column({ name: 'show_phone', default: true })
  showPhone: boolean;

  @Column({ name: 'show_tagline', default: false })
  showTagline: boolean;

  @Column({ name: 'show_logo', default: true })
  showLogo: boolean;

  @Column({ name: 'footer_text', type: 'text', nullable: true })
  footerText: string | null;

  @Column({ name: 'show_footer', default: false })
  showFooter: boolean;

  @Column({ name: 'watermark_text', type: 'varchar', nullable: true })
  watermarkText: string | null;

  @Column({ name: 'show_watermark', default: false })
  showWatermark: boolean;

  // ── Branding colors ───────────────────────────────────────────────────────
  @Column({ name: 'primary_color', type: 'varchar', default: '#f97316' })
  primaryColor: string;

  @Column({ name: 'secondary_color', type: 'varchar', default: '#111827' })
  secondaryColor: string;

  @Column({ name: 'accent_color', type: 'varchar', nullable: true })
  accentColor: string | null;

  // ── Typography ────────────────────────────────────────────────────────────
  @Column({ name: 'font_family', type: 'varchar', default: 'Arial, Helvetica, sans-serif' })
  fontFamily: string;

  // ── Signature ─────────────────────────────────────────────────────────────
  @Column({ name: 'signature_url', type: 'text', nullable: true })
  signatureUrl: string | null;

  @Column({ name: 'show_signature', default: true })
  showSignature: boolean;

  @Column({ name: 'show_page_number', default: false })
  showPageNumber: boolean;

  @Column({ name: 'current_version', default: 1 })
  currentVersion: number;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
