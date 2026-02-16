/*
  Warnings:

  - A unique constraint covering the columns `[idNumber]` on the table `Visitor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Visitor_idNumber_key" ON "Visitor"("idNumber");
