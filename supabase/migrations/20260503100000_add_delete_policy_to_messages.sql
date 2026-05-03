-- Allow users to delete messages they sent or received

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
