CREATE TABLE wallets (
  id CHAR(36) NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  qr_token VARCHAR(128) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_qr_token (qr_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stand VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_products_stand_active (stand, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
  id CHAR(36) NOT NULL,
  wallet_id CHAR(36) NOT NULL,
  type ENUM('credit','debit') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  product_name VARCHAR(255) NULL,
  stand_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_wallet_created (wallet_id, created_at),
  KEY idx_transactions_created (created_at),
  CONSTRAINT fk_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
