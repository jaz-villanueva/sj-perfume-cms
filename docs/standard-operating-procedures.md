# Standard operating procedures

How SJ Perfume Trading's Owner and Staff use the system for everyday work. This covers FR-18 and the procedures in SRS v1.2 §9. Each procedure says who does it, the steps, what the system checks, and what to do when something goes wrong.

Screen names below are the items in the menu on the left (on a phone, tap **Menu**).

**Screens still being built.** The Resellers, Reports and Forecasts screens are not finished yet. Procedures 6, 7 and 8 say what to do in the meantime, and will be updated when those screens are released.

## Who does what

| Task | Owner | Staff |
|---|---|---|
| Add, edit, deactivate or delete user accounts | Yes | No (own name and password only) |
| Add or edit products | Yes | Yes |
| See and change cost prices | Yes | No |
| Receive stock, record returns and adjustments | Yes | Yes |
| Record sales | Yes | Yes |
| Void a sale | Yes | No |
| Add and edit customers | Yes | Yes |
| Export or anonymise a customer's data | Yes | No |
| Add and edit resellers | Yes | No |
| Dashboard | Yes | Yes |
| Audit log | Yes | No |

The system enforces these rules. A button that a role can't use is either hidden or refused with a message.

## Everyday rules

- Use your own account. Never share your password or sign in for someone else; every change is recorded in the audit log under the name of whoever is signed in.
- Record each sale and each delivery when it happens, not at the end of the day from memory.
- On a shared computer, click **Sign out** (top of the menu) before you leave it.
- Every change you save is recorded in the **Audit log** with your name and the time.

---

## 1. Account setup

**Who:** Owner creates and manages accounts. Staff change their own name and password.

### Add a Staff account (Owner)

1. Open **Users** and click **Add staff account**.
2. Enter the person's name and the e-mail address they will sign in with.
3. Click **Suggest** to make a temporary password, or type one (at least 8 characters).
4. Click **Add account**.
5. Tell the person their e-mail and temporary password in person or by private message. The system sends no e-mail.

**System checks:** the name is filled in, the e-mail is valid and not used by another account, and the password is 8 to 72 characters. New accounts are always Staff.

### First sign-in (Staff)

1. Sign in with the e-mail and temporary password from the Owner.
2. Open **Users**. Under **My account → Password**, enter the temporary password as the current password, then your new password twice, and click **Change password**.
3. Check your name under **My account → Name** and correct it if needed.

### Other account changes (Owner)

All on the **Users** screen, in the row of the Staff account:

| To | Click | Notes |
|---|---|---|
| Correct a name or e-mail | **Edit** | A new e-mail becomes the sign-in e-mail right away. |
| Give a new temporary password (forgotten password) | **Reset password** | Tell the person the new password yourself. They change it as in "First sign-in". |
| Stop someone signing in for now (leave, end of contract) | **Deactivate**, then confirm | Takes effect within a minute, even if they are signed in. Their records stay. Undo with **Reactivate**. |
| Remove an account for good | **Delete**, then confirm | See procedure 9. Cannot be undone. |

**If something goes wrong:**

| Message | What to do |
|---|---|
| Another account already uses this e-mail address. | Check the account list; the person may already have an account (maybe deactivated). Reactivate it instead of adding a new one. |
| Use at least 8 characters. | Make the password longer, or click **Suggest**. |
| Your current password is not correct. | Retype it. If it's forgotten, ask the Owner to reset it. |
| Account management is not set up yet | The admin-users service hasn't been deployed. Tell the system maintainer (see `supabase/README.md`). |

If the **Owner's** own password is lost, a maintainer resets it from the Supabase dashboard (`supabase/README.md`, "Owner password reset").

## 2. Product maintenance

**Who:** Owner and Staff. Only the Owner sees cost prices.

1. Open **Products** and type the product's name, SKU or brand in **Search products** first, to make sure it isn't already listed.
2. To add a product, click **+ Create Product**. To change one, click **Edit** in its row.
3. Fill in SKU, name, brand, scent family, size (mL), selling price, reseller price and reorder level. For a new product, enter the stock you are counting now as **Initial stock quantity**.
4. Click **Save Product** (or **Update Product**).
5. Check the row: the price, size and stock status are what you expect.

**System checks:** all fields are required, the SKU must be unique, prices can't be negative. Stock can't be typed in when editing; it changes only through Inventory (procedures 3 and 5) and sales.

**If something goes wrong:** "This SKU already exists" means the product is already in the list, or the SKU is mistyped. Search again before trying another SKU.

## 3. Receiving stock

**Who:** Staff (or the Owner) who received the delivery.

1. Count the items received and keep the delivery receipt.
2. Open **Inventory**, click **+ Record Stock Movement** and choose the product.
3. Set **Movement Type** to **Stock In**.
4. Enter the quantity received (a positive whole number).
5. Enter the delivery receipt or invoice number as **Reference** (for example `DEL-001`), and a short **Reason** if useful (for example "Supplier delivery").
6. Click **Record Movement**, then check the product's **On Hand** went up by the right amount and the delivery appears in **Stock Movement History**.

A customer bringing an item back that can be resold is recorded the same way with **Movement Type: Return**.

**If something goes wrong:** "Stock-in and return quantities must be positive" means a minus sign or zero was entered. A wrong stock-in that was already saved is not edited or deleted; correct it with an adjustment (procedure 5) and write what happened in the reason.

## 4. Recording a sale

**Who:** Staff (or the Owner) who handled the order.

1. Open **Sales** and click **New sale**.
2. Under **Where did the order come from?**, choose **Walk-in**, **Online (Messenger)** or **Reseller**.
3. For a reseller order, choose the reseller. Reseller prices are applied automatically.
   For a walk-in or online order, find the customer by name or mobile number under **Customer (optional)** if they are a regular. If they are new and agree to have their details kept, add them first (procedure 6).
4. Under **Add a product**, type the product name or SKU and click **Add**. Repeat for each product, then set each quantity.
5. Check the lines and the **Total** against the order.
6. Click **Save sale**. The sale number (for example `S-2026-000015`) and the total are shown at the top.

**System checks:** prices come from the product list and can't be typed in. The whole sale is refused, and nothing is saved, if any product doesn't have enough stock. Stock goes down by exactly what was sold, once.

**If something goes wrong:**

| Message | What to do |
|---|---|
| Only N … available | Stock in the system is lower than the order. Check the shelf. If the shelf has more, a delivery or return wasn't recorded: record it (procedure 3), then save the sale. If not, change the quantity. |
| Choose an active reseller | The reseller is inactive; ask the Owner. |
| A sale was saved with a mistake | Tell the Owner. Only the Owner can void it (below); then record the sale again correctly. |

### Voiding a sale (Owner)

Voiding is for a sale that was entered wrongly or cancelled. The sale stays in the list, crossed out, and its stock is returned.

1. Open **Sales** and find the sale.
2. Click **Void**, type the reason (for example "Customer cancelled the order"), and click **Confirm void**.
3. Check the sale shows **Voided** and the stock went back.

A voided sale can't be un-voided. Record a new sale if needed.

## 5. Inventory correction

**Who:** Staff record the adjustment; the Owner reviews it.

1. When a count doesn't match the system (damaged, lost, or miscounted items), count again to be sure.
2. Write down the product, the system's **On Hand**, the counted quantity and the cause.
3. Open **Inventory**, click **+ Record Stock Movement**, choose the product and set **Movement Type** to **Adjustment**.
4. Enter the difference: negative to remove stock (for example `-2` for two broken bottles), positive to add.
5. Enter the **Reason** (required), for example "2 bottles broken in storage, counted 12 Nov".
6. Click **Record Movement**, and check **On Hand** now matches the count.

**System checks:** a reason is required; stock can never go below zero.

**Owner review:** at least weekly, open **Audit log**, set **Area: Stock**, and read the adjustments. Ask about any large or repeated ones.

## 6. Customer and reseller records

**Who:** Owner and Staff for customers. Owner for resellers.

### Customers

1. Open **Customers** and search by name or mobile number first. The same mobile number can't be saved twice.
2. If the customer isn't listed, click **Add customer**.
3. Read the privacy notice to the customer (or show it). Enter only what is needed: name and mobile number, plus e-mail and address only if they are used for orders.
4. Tick **The customer agreed to the privacy notice** only if they agreed, then click **Save customer**. Without consent the system won't save the record; record the sale without a customer instead.
5. To correct details later, click **Edit** in the customer's row.
6. To see what a customer has bought, click **View**. Their sales and total spent are listed. Link future sales to them as in procedure 4.

**If a customer asks to see or remove their data (Owner):**

1. Open **Customers**, click **View** on the customer.
2. To give them a copy: click **Export data**. A file named `customer-<number>-data.json` is saved to Downloads. Send it to the customer privately.
3. To remove their details: click **Anonymise…**, read the message, and click **Yes, anonymise**. Their name, mobile, e-mail and address are erased for good. Their past sales stay under "Anonymised customer #N", so totals and reports don't change.

Both actions are recorded in the audit log. Aim to finish a request within the same day.

### Resellers

The Resellers screen is still being built. Until it is released, the Owner gives new or changed reseller details to the team, who enter them; reseller sales are recorded on the **Sales** screen as in procedure 4.

## 7. Reviewing reports

**Who:** Owner, daily or weekly. Staff may view the dashboard.

1. Open **Dashboard** and choose the **Period**.
2. Check revenue, number of sales and **Sales by channel** against the day's orders, chats and reseller messages.
3. Read **Stock watch** for items at or below their reorder level.
4. During the switch from paper (the first weeks after go-live), compare the day's sales list with the paper record. Any order on paper but not in the system is recorded now (procedure 4); any difference in stock is corrected (procedure 5).

The **Reports** screen (detailed sales and inventory reports) is still being built. This procedure will be extended when it is released.

## 8. Reviewing forecasts

**Who:** Owner, before reordering.

The **Forecasts** screen is still being built. When it is released:

1. Check the forecast period and the date the forecast was made.
2. Check how much sales history it is based on, and read any low-confidence warning. A product with little history needs the Owner's own judgment.
3. Read the suggested quantities as estimates, not orders. The system never places orders.
4. Decide what to reorder using the suggestion, current stock and supplier lead time.

## 9. Administrative deletion

**Who:** Owner only. Every deletion asks for confirmation and is recorded in the audit log.

The system never removes records that past sales or reports depend on. It keeps them and marks them instead:

| Record | Use | What happens |
|---|---|---|
| Sale | **Void** (procedure 4) | The sale stays, crossed out; stock is returned. Sales are never deleted. |
| Product no longer sold | **Delete** on the Products screen | The product is deactivated: hidden from the product list and new sales, kept in past sales. |
| Staff member who left | **Deactivate** first; **Delete** only if they will never return | A deleted account can never sign in again, and can't be restored. Their name stays on the sales and audit entries they made. |
| Customer who asked to be removed | **Anonymise** (procedure 6) | Personal details erased; sales kept. |
| Audit log entries | None | Nobody, including the Owner, can change or delete them. |

Before confirming, check you have the right record: read the name in the confirmation message.

## End-of-day checklist

1. Every order of the day (walk-in, Messenger, reseller) is in **Sales**.
2. Every delivery received is in **Inventory** as **Stock In**.
3. **Stock watch** on the Dashboard is checked; items to reorder are noted for the Owner.
4. Shared computers are signed out.

## When the system can't be reached

1. Try a phone hotspot. If the site still doesn't load, use the paper sales and stock form.
2. Write each sale and delivery on the form as it happens: date and time, channel, customer or reseller, products and quantities.
3. When the system is back, record every line on the form (procedures 3 and 4), then mark the form "encoded" with the date and your initials.
4. Tell the Owner how long the system was down.
