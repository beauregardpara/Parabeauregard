import { z } from "zod";

// ── Communs ──────────────────────────────────────────────────────

export const emailSchema = z.string().email("Adresse email invalide.").max(255);
export const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").max(128);
export const nameSchema = z.string().min(1, "Ce champ est requis.").max(100);
export const phoneSchema = z.string().max(20).optional();

// ── Formulaire de contact ────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(1, "Votre nom est requis.").max(200),
  email: emailSchema,
  phone: z
    .string()
    .max(30)
    .regex(/^[+\d\s().-]*$/, "Numéro de téléphone invalide.")
    .optional()
    .default(""),
  subject: z.string().min(1, "Le sujet est requis.").max(200),
  message: z.string().min(10, "Votre message doit contenir au moins 10 caractères.").max(5000),
});

// ── Auth client ──────────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

// ── Auth admin ───────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

export const createAdminUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  role: z.enum(["SUPER_ADMIN", "CATALOG_MANAGER", "ORDER_MANAGER"]),
});

// ── Checkout ─────────────────────────────────────────────────────

export const checkoutItemSchema = z.object({
  productId: z.number().int().positive("ID produit invalide."),
  qty: z.number().int().min(1, "Quantité minimum : 1.").max(99, "Quantité maximum : 99."),
});

export const checkoutSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis.").max(200),
  phone: z.string().min(5, "Numéro de téléphone invalide.").max(20),
  email: z.string().email("Email invalide.").max(255),
  street: z.string().min(5, "Adresse requise.").max(500),
  city: z.string().min(2, "Ville requise.").max(100),
  postalCode: z.string().max(10).optional(),
  paymentMethod: z.literal("COD", {
    errorMap: () => ({ message: "Mode de paiement non supporté." }),
  }),
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(30).optional(),
  items: z.array(checkoutItemSchema).min(1, "Panier vide.").max(50, "Trop d'articles."),
});

// ── Produits admin ───────────────────────────────────────────────

export const productEditSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(300),
  brand: z.string().max(100).optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  price: z.number().positive("Le prix doit être positif."),
  promoPrice: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  unlimitedStock: z.boolean(),
  categoryId: z.number().int().positive().nullable().optional(),
  isFeatured: z.boolean(),
});

const productStatusAdminSchema = z.enum(["PENDING_REVIEW", "PUBLISHED", "HIDDEN"]);

/** Validation commune aux créations et modifications du catalogue admin. */
export const adminProductSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(1, "Le nom est requis.").max(300),
    slug: z
      .string()
      .trim()
      .min(1, "Le slug est requis.")
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets."),
    sku: z.string().trim().max(120).nullable(),
    brand: z.string().trim().max(100).nullable(),
    categoryId: z.number().int().positive().nullable(),
    shortDescription: z.string().trim().max(500).nullable(),
    description: z.string().trim().max(10000).nullable(),
    price: z.number().finite().min(0, "Le prix ne peut pas être négatif."),
    promoPrice: z.number().finite().min(0).nullable(),
    stock: z.number().int().min(0, "Le stock ne peut pas être négatif."),
    lowStockThreshold: z.number().int().min(0),
    unlimitedStock: z.boolean(),
    isFeatured: z.boolean(),
    status: productStatusAdminSchema,
  })
  .superRefine((value, ctx) => {
    if (value.promoPrice !== null && value.promoPrice > value.price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["promoPrice"], message: "Le prix promo doit être inférieur ou égal au prix." });
    }
  });

// ── Coupons admin ────────────────────────────────────────────────

export const couponSchema = z.object({
  code: z.string().min(2, "Code trop court.").max(30).toUpperCase(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive("La valeur doit être positive."),
  minOrder: z.number().min(0),
  usageLimit: z.number().int().positive().nullable().optional(),
});

// ── Commandes admin ──────────────────────────────────────────────

export const orderStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["NEW", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

// ── Avis admin ───────────────────────────────────────────────────

export const reviewModerationSchema = z.object({
  id: z.number().int().positive(),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

// ── Produits admin (statut & bulk) ──────────────────────────────

export const productStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["PENDING_REVIEW", "PUBLISHED", "HIDDEN"]),
});

export const bulkProductSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "Aucun produit sélectionné."),
  bulkAction: z.enum(["publish", "hide", "pending", "archive", "delete"]),
});

// ── Retours client ──────────────────────────────────────────────

export const returnRefSchema = z
  .string()
  .min(1, "La référence est requise.")
  .max(30)
  .regex(/^PB-\d{4}-[0-9A-Z]{6,10}$/, "Référence invalide.");
export const returnEmailSchema = z.string().email("Email invalide.").max(255);
export const returnReasonSchema = z.string().min(4, "Merci de préciser une raison (min. 4 caractères).").max(1000);

export const returnSchema = z.object({
  reference: returnRefSchema,
  email: returnEmailSchema,
  reason: returnReasonSchema,
  details: z.string().max(2000).optional(),
});

// ── Alertes stock ───────────────────────────────────────────────

export const productAlertSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(255),
  productId: z.number().int().positive("ID produit invalide."),
});
