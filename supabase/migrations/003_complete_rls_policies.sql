-- Complete RLS Policies for all tables
-- Adds missing policies for: organizations, document_chunks, document_acknowledgments, announcement_reads

-- 1. Organizations policy
-- Allow users to read their own organization
CREATE POLICY "Users can read own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Allow only owners to update organization settings
CREATE POLICY "Owners can update organization" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- 2. Document chunks policies
-- Allow users to read document chunks from their org
CREATE POLICY "Document chunks in own org" ON document_chunks
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Allow owners/managers to insert document chunks
CREATE POLICY "Owners/managers can insert document chunks" ON document_chunks
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Allow owners/managers to delete document chunks
CREATE POLICY "Owners/managers can delete document chunks" ON document_chunks
  FOR DELETE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- 3. Document acknowledgments policies
-- Users can insert their own acknowledgments
CREATE POLICY "Users can acknowledge documents" ON document_acknowledgments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Users can read their own acknowledgments
CREATE POLICY "Users can read own acknowledgments" ON document_acknowledgments
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- 4. Announcement reads policies
-- Users can mark announcements as read
CREATE POLICY "Users can mark announcements read" ON announcement_reads
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Users can read their own read status, owners/managers can see all
CREATE POLICY "Users can read announcement status" ON announcement_reads
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- 5. Additional role-based policies

-- Owners/managers can update user records in their org
CREATE POLICY "Owners/managers can update users" ON users
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Owners can create users in their org
CREATE POLICY "Owners can create users" ON users
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- Owners/managers can insert conversations
CREATE POLICY "Owners/managers can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Owners/managers can update conversations
CREATE POLICY "Owners/managers can update conversations" ON conversations
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Users can insert messages in their org
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Owners/managers can create announcements
CREATE POLICY "Owners/managers can create announcements" ON announcements
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Owners can manage documents
CREATE POLICY "Owners can insert documents" ON documents
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can update documents" ON documents
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- Users can insert/update their own shifts
CREATE POLICY "Users can manage own shifts" ON shifts
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own shifts" ON shifts
  FOR UPDATE USING (
    user_id = auth.uid() OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
