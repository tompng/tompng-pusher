require 'json'
require 'digest/sha2'
require 'net/http'
module Pusher
  ENDPOINT = '<%= ENDPOINT_HOST %>:<%= ENDPOINT_PORT %>'
  class << self
    attr_writer :SECRET_KEY
    def SECRET_KEY
      @SECRET_KEY || ENV['PUSHER_SECRET_KEY'] || (@RAND_KEY||=rand)
    end

    def send data, dst
      query = {
        keys: key_versions(dst).to_json,
        data: data.to_json
      }
      Net::HTTP.new(*ENDPOINT.split(':')).post('/', URI.encode_www_form(query))
    end

    def listen dst
      key_versions(dst).map{|m, v|
        [Digest::SHA2.hexdigest(m), v.to_s]
      }.to_json
    end

    private

    def group_id model
      name = model.class.name
      key = model.respond_to?(:id) ? model.id : model
      Digest::SHA2.hexdigest "#{self.SECRET_KEY}_#{name}_#{key}"
    end

    def key_versions args
      dst = args[:to]
      version = args[:version] || Time.now.strftime('%s%L').to_i
      if dst.respond_to? :map
        dst.map{|m,v|[group_id(m), v||version]}
      else
        [[group_id(dst), version]]
      end
    end

  end
end
