# gem requires
require 'config/settings'
require 'active_support/inflector' # see https://code.google.com/p/ruby-sequel/issues/detail?id=329
require "benchmark"
require 'sequel'
require 'logger'

Sequel::Model.raise_on_save_failure = true
options = {}
options[:logger] = Logger.new(STDOUT) if SvegSettings.environment == :development
db_config = {
    :adapter => 'mysql2',        # NOT 'postgresql'
    :default_schema  => 'public',  # NOT :schema_search_path
    :user => 'sveg',         # NOT :username
    :password => 'svegsveg',
    :host => 'localhost',
    :database => "sveg_#{SvegSettings.environment}",
    :max_connections => 5          # NOT :pool'
}
DB = Sequel.connect("mysql2://sveg:svegsveg@localhost/sveg_#{SvegSettings.environment}",
	options)
