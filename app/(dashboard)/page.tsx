{/* COMMISSIONER ANNOUNCEMENTS SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">📢 League Announcements</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setIsAddingAnnouncement(!isAddingAnnouncement);
                setEditingId(null);
                setTitleInput('');
                setContentInput('');
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              {isAddingAnnouncement ? 'Cancel' : '+ New Announcement'}
            </button>
          )}
        </div>

        {/* ADMIN ADD / EDIT FORM */}
        {isAdmin && isAddingAnnouncement && (
          <form onSubmit={handleSaveAnnouncement} className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              {editingId ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>
            <input
              type="text"
              placeholder="Announcement Title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <textarea
              placeholder="Announcement details..."
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingAnnouncement(false);
                  setEditingId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Post Announcement'}
              </button>
            </div>
          </form>
        )}

        {/* ANNOUNCEMENTS LIST */}
        {announcements.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-3">No announcements posted yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <div key={item.id} className="bg-indigo-50/40 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700/80 p-4 rounded-xl space-y-2 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-indigo-950 dark:text-white tracking-tight">{item.title}</h3>
                    <span className="text-[10px] font-semibold text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-800">{item.date}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="text-[11px] font-bold text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>